package com.iglesiadelacalle.sistemaiglesia.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.iglesiadelacalle.sistemaiglesia.models.Persona;
import com.iglesiadelacalle.sistemaiglesia.models.Promocion;

@Repository
public interface PromocionRepository extends JpaRepository<Promocion, Integer> {
    // Busca la promoción más reciente de una persona para saber su rol actual
    Optional<Promocion> findTopByPersonaOrderByFechaDesc(Persona persona);
}
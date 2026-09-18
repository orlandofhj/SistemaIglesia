package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.Bloque; 

@Repository
public interface BloqueRepository extends JpaRepository<Bloque, Integer> {
    boolean existsByDenominacionIgnoreCase(String denominacion);
    boolean existsByDenominacionIgnoreCaseAndIdBloqueNot(String denominacion, Integer idBloque);
}
package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.HistorialEvento;

@Repository
public interface HistorialEventoRepository extends JpaRepository<HistorialEvento, Integer> {
}